export async function loadHistory() {
  const response = await fetch(new URL("./datos/historico.json", import.meta.url));
  if (!response.ok) throw new Error("No se pudo leer el histórico.");
  const { columns, rows, features, categories } = await response.json();
  const records = rows.map(row => Object.fromEntries(columns.map((name, index) => [name, row[index]])));
  records.sort((a, b) => b.score - a.score || a.id - b.id);
  return { records, features, categories };
}
