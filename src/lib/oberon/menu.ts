import { getOberonClient } from "./client";

export type OberonMenuItem = {
  id: string;
  code?: string;
  name: string;
  price: number;
  groupName?: string;
};

type MenuItemsArgs = Record<string, never>;

  // ha kell szűrés (pl. csak vendéglátás csoport), ide jöhetnek extra mezők
type OberonMenuItemRaw = {
  Id?: string | number;
  Code?: string;
  Name?: string;
  Price?: number | string;
  GroupName?: string;
  [key: string]: unknown;
};

type OberonMenuResponse = {
  Items?: {
    Item?: OberonMenuItemRaw[] | OberonMenuItemRaw;
  };
};

export async function getOberonMenuItems(): Promise<OberonMenuItem[]> {
  const client = await getOberonClient();

  const args: MenuItemsArgs = {};

  const result = await new Promise<unknown>((resolve, reject) => {
    (client as unknown as {
      GetMenuItems: (
        args: MenuItemsArgs,
        cb: (err: unknown, res: unknown) => void
      ) => void;
    }).GetMenuItems(args, (err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });

  const typed = result as OberonMenuResponse;

  const raw = typed.Items?.Item;
  const items: OberonMenuItemRaw[] = Array.isArray(raw)
    ? raw
    : raw
    ? [raw]
    : [];

  return items.map((i) => ({
    id: String(i.Id ?? ""),
    code: i.Code,
    name: i.Name ?? "",
    price: Number(i.Price ?? 0),
    groupName: i.GroupName,
  }));
}
