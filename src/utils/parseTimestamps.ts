export interface TimeStamp {
  start: number;
  stop: number;
  word: string;
}

export async function parseTimestampsCSV(filePath: string): Promise<TimeStamp[]> {
  if (!filePath) {
    return [];
  }

  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      console.error(`Failed to fetch timestamps CSV: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const text = await response.text();
    
    // Check if response is HTML instead of CSV
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      console.error('Received HTML response instead of CSV data');
      return [];
    }
    
    // Split the CSV into lines and remove empty lines
    const lines = text.split('\n').filter(line => line.trim());
    
    // If no valid lines, return empty array
    if (lines.length < 2) {
      return [];
    }
    
    // Skip the header row (first line)
    const dataLines = lines.slice(1);
    
    return dataLines.map(line => {
      const [start, stop, word] = line.split(',').map(val => val.trim());
      const startNum = parseFloat(start);
      const stopNum = parseFloat(stop);
      
      if (isNaN(startNum) || isNaN(stopNum)) {
        // Instead of throwing an error, log and skip this line
        console.warn(`Invalid timestamp values in line: ${line}`);
        return null;
      }
      
      return { 
        start: startNum, 
        stop: stopNum,
        word: word || 'fail' // fallback if word is missing
      };
    }).filter((item): item is TimeStamp => item !== null); // Filter out null values
  } catch (error) {
    console.error('Error parsing timestamps CSV:', error);
    return [];
  }
} 