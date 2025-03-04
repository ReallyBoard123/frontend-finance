import { useFinanceStore } from '@/lib/store';
import { Button } from '../ui/button';

function ResetStoreButton() {
  const reset = useFinanceStore(state => state.reset);
  
  const handleReset = () => {
    if (confirm('Are you sure you want to reset all data? This will clear all transactions and data from the UI.')) {
      reset();
      window.location.reload(); // Reload the page to ensure everything is reset
    }
  };
  
  return (
    <Button 
      onClick={handleReset} 
      variant="destructive"
      size="sm"
    >
      Reset UI Data
    </Button>
  );
}

export default ResetStoreButton 