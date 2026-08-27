import type { CatalogProduct } from "@/lib/types";

export const markets = [
  { id: "coelho", name: "Coelho Diniz", district: "Centro" },
  { id: "bigmais", name: "Big Mais", district: "Esplanada" },
  { id: "bh", name: "Supermercados BH", district: "São Pedro" },
];

export const products: CatalogProduct[] = [
  {
    id: "arroz-tio-joao-5kg",
    name: "Arroz Tio João Tipo 1",
    brand: "Tio João",
    packageSize: "5 kg",
    prices: [
      {
        id: "1",
        market: "Big Mais",
        district: "Esplanada",
        amount: 29.9,
        type: "vigente",
        referenceDate: "Hoje",
        validUntil: "31 ago",
      },
      {
        id: "2",
        market: "Coelho Diniz",
        district: "Centro",
        amount: 31.49,
        type: "vigente",
        referenceDate: "Hoje",
        validUntil: "30 ago",
      },
      {
        id: "3",
        market: "Supermercados BH",
        district: "São Pedro",
        amount: 30.99,
        type: "histórico_desatualizado",
        referenceDate: "12 ago",
      },
    ],
  },
  {
    id: "leite-itambe-1l",
    name: "Leite UHT Integral",
    brand: "Itambé",
    packageSize: "1 L",
    prices: [
      {
        id: "4",
        market: "Coelho Diniz",
        district: "Centro",
        amount: 4.79,
        type: "vigente",
        referenceDate: "Hoje",
        validUntil: "30 ago",
      },
      {
        id: "5",
        market: "Big Mais",
        district: "Esplanada",
        amount: 4.99,
        type: "cupom_aprovado",
        referenceDate: "26 ago",
      },
      {
        id: "6",
        market: "Supermercados BH",
        district: "São Pedro",
        amount: 5.19,
        type: "histórico_desatualizado",
        referenceDate: "10 ago",
      },
    ],
  },
  {
    id: "creme-dental-colgate-90g",
    name: "Creme Dental Máxima Proteção",
    brand: "Colgate",
    packageSize: "90 g",
    prices: [
      {
        id: "7",
        market: "Coelho Diniz",
        district: "Centro",
        amount: 6.89,
        type: "vigente",
        referenceDate: "Hoje",
        validUntil: "30 ago",
      },
      {
        id: "8",
        market: "Big Mais",
        district: "Esplanada",
        amount: 7.29,
        type: "vigente",
        referenceDate: "Hoje",
        validUntil: "31 ago",
      },
    ],
    alternatives: [
      { name: "Creme Dental Sorriso 90 g", amount: 4.49, market: "Big Mais" },
    ],
  },
];
