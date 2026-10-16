import { notFound } from 'next/navigation';
import StockView from '@/components/StockView';
import { cleanSymbol } from '@/lib/http';

export default function StockPage({ params }: { params: { symbol: string } }) {
  const symbol = cleanSymbol(decodeURIComponent(params.symbol));
  if (!symbol) notFound();
  return (
    <div className="page">
      <StockView symbol={symbol} />
    </div>
  );
}
