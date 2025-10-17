export interface CarrierRow {
  TrnspCode: number;
  CarrierName: string;
  TruckType: 'LTL' | 'TL';
}

export interface QuoteActualRow {
  quoteDate: Date;
  carrier: number;
  weight: number;
  quote: number;
  amount: number;
}

export interface DeliveryRow {
  carrier: number;
  pickup: Date;
  delivery: Date;
  expected_delivery: Date;
}
