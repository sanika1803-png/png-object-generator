interface Props {
  title: string;
  folderName: string;
  rows: { label: string; value: string | number }[];
}

/** Summary shown after a folder is chosen (folder name + counts). */
export function FolderInfo({ title, folderName, rows }: Props) {
  return (
    <div className="rounded-lg border p-3 text-sm">
      <div className="font-semibold">{title}</div>
      <div className="text-gray-600">Folder: {folderName}</div>
      {rows.map((r) => (
        <div key={r.label} className="text-gray-600">
          {r.label}: {r.value}
        </div>
      ))}
    </div>
  );
}
