export class YZECoreItem extends Item {
  getRollData() {
    const data = foundry.utils.deepClone(this.system ?? {});

    data.yze = {
      itemType: this.type,
      itemName: this.name
    };

    if (this.actor?.getRollData) {
      data.actor = this.actor.getRollData();
    }

    return data;
  }
}
