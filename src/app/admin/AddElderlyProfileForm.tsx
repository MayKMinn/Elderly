import { AddProfileFormBase } from "./AddProfileFormBase";
import type { AddProfileFormBaseProps } from "./AddProfileFormBase";

type AddElderlyProfileFormProps = Omit<AddProfileFormBaseProps, "type">;

export function AddElderlyProfileForm(props: AddElderlyProfileFormProps) {
  return <AddProfileFormBase {...props} type="elderly" />;
}
