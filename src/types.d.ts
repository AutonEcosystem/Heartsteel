export type Trait = {
  trait_type: string;
  trait_name: string;
};

export type TokenMetadata = {
  contractAddress: string;
  tokenID: string;
  rarityRank: number;
  traits: Trait[];
};
