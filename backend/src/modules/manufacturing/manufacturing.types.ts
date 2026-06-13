export interface ManufacturingOrder {
  id: string;
  moNumber: string;
  productId: string;
  qtyToProduce: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillOfMaterial {
  id: string;
  productId: string;
  createdAt: Date;
  updatedAt: Date;
}
