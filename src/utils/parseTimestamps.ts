export interface TimeStamp {
  start: number;
  stop: number;
  word: string;
}

export async function parseTimestampsCSV(filePath: string): Promise<TimeStamp[]> {
  try {
    const response = await fetch(filePath);
    const text = await response.text();
    
    // Split the CSV into lines and remove empty lines
    const lines = text.split('\n').filter(line => line.trim());
    
    // Skip the header row (first line)
    const dataLines = lines.slice(1);
    
    return dataLines.map(line => {
      const [start, stop, word] = line.split(',').map(val => val.trim());
      const startNum = parseFloat(start);
      const stopNum = parseFloat(stop);
      
      if (isNaN(startNum) || isNaN(stopNum)) {
        throw new Error(`Invalid timestamp values in line: ${line}`);
      }
      
      return { 
        start: startNum, 
        stop: stopNum,
        word: word || 'fail' // fallback to 'test' if word is missing
      };
    });
  } catch (error) {
    console.error('Error parsing timestamps CSV:', error);
    return [];
  }
} 