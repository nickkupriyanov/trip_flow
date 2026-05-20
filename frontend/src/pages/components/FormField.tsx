import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode
} from "react";

import { Label } from "@/components/ui/label";

type FieldControlProps = {
  id?: string;
};

type FormFieldProps = {
  children: ReactNode;
  error?: string;
  htmlFor?: string;
  label: string;
};

export function FormField({ children, error, htmlFor, label }: FormFieldProps) {
  const generatedId = useId();
  const childId =
    isValidElement<FieldControlProps>(children) ? children.props.id : undefined;
  const controlId = htmlFor ?? childId ?? generatedId;
  const control =
    isValidElement<FieldControlProps>(children) && children.props.id === undefined
      ? cloneElement(children as ReactElement<FieldControlProps>, { id: controlId })
      : children;

  return (
    <div className="space-y-2">
      <Label htmlFor={controlId}>{label}</Label>
      {control}
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
