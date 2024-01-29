class downloadsCounter {
    constructor(elemId) {
        this._init(elemId);
    }

    _init(elem) {
        this.elemId = elem;
        this.asked = 0;
        this.done = 0;
        this.errors = 0;
    }

    addAsked(n = 1) {
        this.asked+=n;
        console.log(this.asked);
        this.update();
    }

    addDone(n = 1) {
        this.done+=n;
        this.update();
    }

    addError(n = 1) {
        this.errors+=n;
        this.update();
    }

    displayString() {
        return `${this.done}/${this.asked} (${this.errors} errors)`;
    }

    update() {
        const e = document.querySelector(this.elemId);
        console.log(e, this.elemId);
        if (e){
            e.innerText = this.displayString();
            console.log(e.innerText);
        }
    }

}