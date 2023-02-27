
export default class InventionSummary {
  companyId: string;
  completedIds: Set<string>;

  activeId: string | null;
  activeInvestment: number;

  pendingIds: Array<string>;
  canceledIds: Set<string>;

  constructor (companyId: string, completedIds: Set<string> = new Set(), activeId: string | null = null, activeInvestment: number = 0, pendingIds: Array<string> = [], canceledIds: Set<string> = new Set()) {
    this.companyId = companyId;
    this.completedIds = completedIds;
    this.activeId = activeId;
    this.activeInvestment = activeInvestment;
    this.pendingIds = pendingIds;
    this.canceledIds = canceledIds;
  }

  isCompleted (inventionId: string): boolean { return this.completedIds.has(inventionId); }
  isActive (inventionId: string): boolean { return this.activeId === inventionId; }
  isPending (inventionId: string): boolean { return this.pendingIds.indexOf(inventionId) >= 0; }
  isCanceled (inventionId: string): boolean { return this.canceledIds.has(inventionId); }

  queuePending (inventionIds: Array<string>) {
    for (const id of inventionIds) {
      if (this.pendingIds.indexOf(id) < 0) {
        this.pendingIds.push(id);
      }
    }
  }
  queueCancel (inventionIds: Set<string>) {
    this.canceledIds = new Set([...this.canceledIds, ...inventionIds]);
  }

  toJson (): any {
    return {
      companyId: this.companyId,
      completedIds: Array.from(this.completedIds),
      activeId: this.activeId,
      activeInvestment: this.activeInvestment,
      pendingIds: this.pendingIds,
      canceledIds: Array.from(this.canceledIds)
    };
  }

  static fromJson (json: any): InventionSummary {
    return new InventionSummary(
      json.companyId,
      new Set(json.completedIds ?? []),
      json.activeId,
      json.activeInvestment,
      json.pendingIds ?? [],
      new Set(json.canceledIds ?? [])
    );
  }
}
