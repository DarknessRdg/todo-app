export class DateOnly {
  readonly day: number;

  // month varies from:
  // january(1) ... december(12)
  readonly month: number;

  readonly year: number;

  constructor({
    day,
    month,
    year,
  }: {
    day: number;
    month: number;
    year: number;
  }) {
    this.day = day;
    this.month = month;
    this.year = year;
  }

  toDate = () => new Date(this.year, this.month - 1, this.year);
  toIsoString = () => this.toDate().toISOString();

  static fromDate = (d: Date) =>
    new DateOnly({
      day: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    });
}
