// lib/logger.ts
import fs from 'fs';
import path from 'path';

export const logger = {
  log: (message: any) => {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp}: ${typeof message === 'object' ? JSON.stringify(message, null, 2) : message}\n`;
    
    fs.appendFileSync(path.join(process.cwd(), 'transaction.log'), logMessage);
    console.log(message);
  },
  
  error: (message: any) => {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} ERROR: ${typeof message === 'object' ? JSON.stringify(message, null, 2) : message}\n`;
    
    fs.appendFileSync(path.join(process.cwd(), 'transaction.log'), logMessage);
    console.error(message);
  }
};