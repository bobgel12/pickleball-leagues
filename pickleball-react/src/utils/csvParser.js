export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) throw new Error("CSV file must have at least a header and one data row");

  // Parse header to find the "Registrant" column index
  const header = lines[0].split(',').map(h => h.trim());
  const registrantIndex = header.findIndex(col =>
    col.toLowerCase().includes('registrant') ||
    col.toLowerCase().includes('name') ||
    col.toLowerCase().includes('player')
  );

  if (registrantIndex === -1) {
    throw new Error("Could not find 'Registrant' or 'Name' column in CSV file");
  }

  // Extract player names from the Registrant column
  const players = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle CSV parsing - account for quoted fields
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim()); // Add last field

    if (fields.length > registrantIndex) {
      const name = fields[registrantIndex].trim();
      if (name && name.length > 0) {
        players.push(name);
      }
    }
  }

  return players;
}

export function parseScore(input) {
  if (!input) return null;
  const m = String(input).trim().match(/^(\d+)\s*[-:x]\s*(\d+)$/i);
  if (!m) return null;
  return { a: Number(m[1]), b: Number(m[2]) };
}

