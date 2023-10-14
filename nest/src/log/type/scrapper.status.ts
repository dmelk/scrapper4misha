export class ScrapperStatus {
  public static readonly EMPTY = '';

  public static readonly IN_PROGRESS = 'in_progress';

  public static readonly COMPLETED = 'completed';
}

export type ScrapperStatusType =
  | typeof ScrapperStatus.IN_PROGRESS
  | typeof ScrapperStatus.COMPLETED
  | typeof ScrapperStatus.EMPTY;
