export interface Prediction {
  box: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  label: string;
  score: number;
}