from __future__ import annotations

import re
from datetime import date
from html.parser import HTMLParser
from typing import Literal
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

from app.schemas.tour_option import TourOptionCreate


class QuiQuoImportError(ValueError):
    pass


class QuiQuoFetchError(QuiQuoImportError):
    pass


MONTHS_RU = {
    "янв": 1,
    "фев": 2,
    "мар": 3,
    "апр": 4,
    "мая": 5,
    "май": 5,
    "июн": 6,
    "июл": 7,
    "авг": 8,
    "сен": 9,
    "сент": 9,
    "окт": 10,
    "ноя": 11,
    "дек": 12,
}

SUPPORTED_CURRENCIES = {"RUB", "USD", "EUR"}
VOID_TAGS = {
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
}


def validate_qui_quo_url(url: str) -> str:
    parsed = urlparse(url.strip())
    if parsed.scheme != "https" or parsed.netloc.lower() != "qui-quo.ru":
        raise QuiQuoImportError("Поддерживаются только ссылки Qui-Quo")
    if not parsed.path.strip("/"):
        raise QuiQuoImportError("Поддерживаются только ссылки Qui-Quo")
    return parsed.geturl()


def fetch_qui_quo_html(url: str, *, timeout_seconds: int = 10) -> str:
    validated_url = validate_qui_quo_url(url)
    request = Request(
        validated_url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (compatible; TripFlow/1.0; "
                "+https://qui-quo.ru import)"
            )
        },
    )
    try:
        with urlopen(request, timeout=timeout_seconds) as response:
            charset = response.headers.get_content_charset() or "utf-8"
            return response.read().decode(charset, errors="replace")
    except (HTTPError, URLError, TimeoutError, OSError) as exc:
        raise QuiQuoFetchError("Не удалось открыть подборку Qui-Quo") from exc


def parse_qui_quo_tour_options(
    html: str,
    *,
    source_url: str,
    default_year: int | None = None,
) -> list[TourOptionCreate]:
    validated_url = validate_qui_quo_url(source_url)
    parser = _QuiQuoToursParser(validated_url)
    parser.feed(html)
    parser.close()
    parsed_year = default_year or date.today().year
    options = [
        _tour_to_option(tour, source_url=validated_url, default_year=parsed_year)
        for tour in parser.tours
    ]
    options = [option for option in options if option is not None]
    if not options:
        raise QuiQuoImportError("В подборке не найдены варианты тура")
    return options


class _TourData:
    def __init__(self) -> None:
        self.title: str | None = None
        self.country_text: str | None = None
        self.description: str | None = None
        self.nights_text: str | None = None
        self.dates_text: str | None = None
        self.meal_type: str | None = None
        self.room_type: str | None = None
        self.price_text: str | None = None
        self.link: str | None = None
        self.amenities: list[str] = []


CaptureTarget = Literal[
    "title",
    "country",
    "description",
    "nights",
    "dates",
    "meal",
    "room",
    "price",
    "amenity",
]


class _QuiQuoToursParser(HTMLParser):
    def __init__(self, source_url: str) -> None:
        super().__init__(convert_charrefs=True)
        self.source_url = source_url
        self.tours: list[_TourData] = []
        self._current: _TourData | None = None
        self._section_depth = 0
        self._tag_stack: list[tuple[str, set[str]]] = []
        self._capture: CaptureTarget | None = None
        self._capture_depth = 0
        self._capture_parts: list[str] = []

    def handle_starttag(
        self,
        tag: str,
        attrs: list[tuple[str, str | None]],
    ) -> None:
        attrs_dict = {name: value or "" for name, value in attrs}
        classes = set(attrs_dict.get("class", "").split())
        is_void = tag in VOID_TAGS
        if not is_void:
            self._tag_stack.append((tag, classes))

        if tag == "section" and "tour" in classes:
            self._current = _TourData()
            self._section_depth = len(self._tag_stack)

        if self._current is None:
            return

        if tag == "a":
            href = attrs_dict.get("href")
            if href and self._current.link is None and (
                "thumb__link" in classes or self._has_ancestor_class("name")
            ):
                self._current.link = urljoin(self.source_url, href)

        target = self._target_for(tag, classes)
        if target is not None:
            self._capture = target
            self._capture_depth = len(self._tag_stack)
            self._capture_parts = []

    def handle_data(self, data: str) -> None:
        if self._capture is not None:
            self._capture_parts.append(data)

    def handle_entityref(self, name: str) -> None:
        if self._capture is not None:
            self._capture_parts.append(f"&{name};")

    def handle_endtag(self, tag: str) -> None:
        if (
            self._capture is not None
            and len(self._tag_stack) == self._capture_depth
            and self._current is not None
        ):
            self._store_capture(self._capture, _clean_text(" ".join(self._capture_parts)))
            self._capture = None
            self._capture_depth = 0
            self._capture_parts = []

        if (
            self._current is not None
            and tag == "section"
            and len(self._tag_stack) == self._section_depth
        ):
            self.tours.append(self._current)
            self._current = None
            self._section_depth = 0

        self._pop_tag(tag)

    def _target_for(self, tag: str, classes: set[str]) -> CaptureTarget | None:
        if self._current is None:
            return None
        if tag == "a" and self._has_ancestor_class("name"):
            return "title"
        if "country" in classes:
            return "country"
        if "description-text" in classes:
            return "description"
        if "nights" in classes:
            return "nights"
        if "dates" in classes:
            return "dates"
        if "board" in classes:
            return "meal"
        if "room" in classes:
            return "room"
        if "price" in classes:
            return "price"
        if "amenity" in classes:
            return "amenity"
        return None

    def _has_ancestor_class(self, class_name: str) -> bool:
        return any(class_name in classes for _, classes in self._tag_stack[:-1])

    def _pop_tag(self, tag: str) -> None:
        if tag in VOID_TAGS:
            return
        while self._tag_stack:
            open_tag, _ = self._tag_stack.pop()
            if open_tag == tag:
                return

    def _store_capture(self, target: CaptureTarget, value: str) -> None:
        if self._current is None or not value:
            return
        if target == "title":
            self._current.title = value
        elif target == "country":
            self._current.country_text = value
        elif target == "description":
            self._current.description = value
        elif target == "nights":
            self._current.nights_text = value
        elif target == "dates":
            self._current.dates_text = value
        elif target == "meal":
            self._current.meal_type = value
        elif target == "room":
            self._current.room_type = value
        elif target == "price":
            self._current.price_text = value
        elif target == "amenity":
            self._current.amenities.append(value)


def _tour_to_option(
    tour: _TourData,
    *,
    source_url: str,
    default_year: int,
) -> TourOptionCreate | None:
    raw_title = tour.title or tour.link or "Вариант тура"
    clean_title, stars = _parse_title(raw_title)
    country, resort = _parse_country(tour.country_text)
    date_from, date_to = _parse_dates(tour.dates_text, default_year=default_year)
    price, currency = _parse_price(tour.price_text)
    nights = _parse_first_int(tour.nights_text)
    comment_parts = [f"Импортировано из Qui-Quo: {source_url}"]
    if tour.description:
        comment_parts.append(tour.description)

    return TourOptionCreate(
        title=clean_title,
        country=country,
        resort=resort,
        hotel_name=clean_title,
        hotel_stars=stars,
        date_from=date_from,
        date_to=date_to,
        nights=nights,
        room_type=tour.room_type,
        meal_type=tour.meal_type,
        price=price,
        currency=currency,
        link=tour.link,
        pros=tour.amenities,
        cons=[],
        agent_comment="\n\n".join(comment_parts),
        is_recommended=False,
    )


def _parse_title(value: str) -> tuple[str, int | None]:
    title = re.sub(r"^\s*\d+\.\s*", "", value).strip()
    stars_match = re.search(r"\b([1-5])\s*\*\s*$", title)
    stars = int(stars_match.group(1)) if stars_match else None
    if stars_match:
        title = title[: stars_match.start()].strip()
    return title or "Вариант тура", stars


def _parse_country(value: str | None) -> tuple[str | None, str | None]:
    if not value:
        return None, None
    parts = [part.strip() for part in value.split(",", maxsplit=1)]
    country = parts[0] if parts and parts[0] else None
    resort = parts[1] if len(parts) > 1 and parts[1] else None
    return country, resort


def _parse_dates(
    value: str | None,
    *,
    default_year: int,
) -> tuple[date | None, date | None]:
    if not value:
        return None, None
    normalized = _clean_text(value.replace("–", "-").replace("—", "-"))
    matches = re.findall(r"(\d{1,2})\s+([а-яА-ЯёЁ]+)", normalized)
    if len(matches) < 2:
        return None, None
    parsed_dates = [
        _date_from_day_month(day, month, default_year=default_year)
        for day, month in matches[:2]
    ]
    if parsed_dates[0] and parsed_dates[1] and parsed_dates[1] < parsed_dates[0]:
        parsed_dates[1] = date(default_year + 1, parsed_dates[1].month, parsed_dates[1].day)
    return parsed_dates[0], parsed_dates[1]


def _date_from_day_month(
    day_text: str,
    month_text: str,
    *,
    default_year: int,
) -> date | None:
    month = MONTHS_RU.get(month_text.strip().lower().replace(".", ""))
    if month is None:
        return None
    try:
        return date(default_year, month, int(day_text))
    except ValueError:
        return None


def _parse_price(value: str | None) -> tuple[int | None, str]:
    if not value:
        return None, "RUB"
    currency = "RUB"
    currency_match = re.search(r"\b(RUB|USD|EUR)\b", value.upper())
    if currency_match and currency_match.group(1) in SUPPORTED_CURRENCIES:
        currency = currency_match.group(1)
    digits = re.sub(r"\D", "", value)
    return (int(digits) if digits else None), currency


def _parse_first_int(value: str | None) -> int | None:
    if not value:
        return None
    match = re.search(r"\d+", value)
    return int(match.group(0)) if match else None


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\xa0", " ")).strip()
