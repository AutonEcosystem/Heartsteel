export type Trait = {
  type: string;
  value: string;
};

export type TokenMetadata = {
  contractAddress: string;
  tokenID: string;
  rarityRank: number | null;
  traits: Trait[];
};
