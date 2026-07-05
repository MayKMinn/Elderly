import { AddProfileFormBase } from "./AddProfileFormBase";
import type { AddProfileFormBaseProps } from "./AddProfileFormBase";

type AddNurseProfileFormProps = Omit<AddProfileFormBaseProps, "type">;

export function AddNurseProfileForm(props: AddNurseProfileFormProps) {
  return <AddProfileFormBase {...props} type="nurse" />;
}
