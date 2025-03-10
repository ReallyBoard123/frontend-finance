// script to run once to update all transaction statuses
// Save this as scripts/update-transaction-statuses.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateTransactionStatuses() {
  console.log('Starting transaction status update...');
  
  try {
    // 1. Get all transactions
    const transactions = await prisma.transaction.findMany({
      include: {
        category: true
      }
    });
    
    console.log(`Found ${transactions.length} transactions total`);

    // 2. Group transactions by status
    const statusGroups: Record<string, any[]> = {};
    transactions.forEach(t => {
      const status = t.status || 'unprocessed';
      if (!statusGroups[status]) statusGroups[status] = [];
      statusGroups[status].push(t);
    });
    
    console.log('Current status distribution:');
    Object.entries(statusGroups).forEach(([status, txs]) => {
      console.log(`- ${status}: ${txs.length} transactions`);
    });
    
    // 3. Find transactions with categories that aren't processed
    const transactionsToUpdate = transactions.filter(t => 
      (t.categoryId != null) && 
      t.status !== 'processed' && 
      t.status !== 'completed' &&
      t.status !== 'pending_inquiry'
    );
    
    console.log(`Found ${transactionsToUpdate.length} transactions with categories that need to be marked as processed`);

    // 4. Update all these transactions to 'processed' status
    if (transactionsToUpdate.length > 0) {
      const updateResult = await prisma.transaction.updateMany({
        where: {
          id: {
            in: transactionsToUpdate.map(t => t.id)
          }
        },
        data: {
          status: 'processed'
        }
      });
      
      console.log(`Updated ${updateResult.count} transactions to 'processed' status`);
    }
    
    // 5. Find transactions with no category that should be marked as 'missing'
    const missingTransactions = transactions.filter(t => 
      t.categoryId == null && 
      t.status !== 'missing' && 
      t.status !== 'pending_inquiry' &&
      // Skip special transactions
      t.transactionType !== 'IVMC-Hochr.' && 
      !['600', '23152'].includes(t.internalCode.replace(/^0+/, ''))
    );
    
    console.log(`Found ${missingTransactions.length} transactions with no category that should be marked as 'missing'`);
    
    // 6. Update all these transactions to 'missing' status
    if (missingTransactions.length > 0) {
      const missingUpdateResult = await prisma.transaction.updateMany({
        where: {
          id: {
            in: missingTransactions.map(t => t.id)
          }
        },
        data: {
          status: 'missing'
        }
      });
      
      console.log(`Updated ${missingUpdateResult.count} transactions to 'missing' status`);
    }
    
    // 7. Find transactions with special codes that should be marked as 'special'
    const specialTransactions = transactions.filter(t => 
      (t.transactionType === 'IVMC-Hochr.' || t.internalCode.replace(/^0+/, '') === '23152') &&
      t.status !== 'special'
    );
    
    console.log(`Found ${specialTransactions.length} special transactions that should be marked as 'special'`);
    
    // 8. Update all these transactions to 'special' status
    if (specialTransactions.length > 0) {
      const specialUpdateResult = await prisma.transaction.updateMany({
        where: {
          id: {
            in: specialTransactions.map(t => t.id)
          }
        },
        data: {
          status: 'special'
        }
      });
      
      console.log(`Updated ${specialUpdateResult.count} transactions to 'special' status`);
    }
    
    // 9. Get final status counts
    const updatedTransactions = await prisma.transaction.findMany();
    const finalStatusGroups: Record<string, number> = {};
    updatedTransactions.forEach(t => {
      const status = t.status || 'unprocessed';
      finalStatusGroups[status] = (finalStatusGroups[status] || 0) + 1;
    });
    
    console.log('Final status distribution:');
    Object.entries(finalStatusGroups).forEach(([status, count]) => {
      console.log(`- ${status}: ${count} transactions`);
    });
    
    console.log('Transaction status update completed successfully');
  } catch (error) {
    console.error('Error updating transaction statuses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
updateTransactionStatuses();