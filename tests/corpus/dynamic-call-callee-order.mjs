// A call through an untyped receiver reads its callee before it evaluates
// the arguments: an argument that replaces the member does not change which
// function the call runs. Class instance fields, properties added to an
// instance later, plain object properties, prototype methods, getters, own
// accessors, a field that does not hold a function, and array methods named
// like a class field or getter.
const log = [];
class Holder {
  constructor() {
    this.run = () => "field-init";
  }
  get viaGetter() {
    log.push("getter");
    return () => "from-getter";
  }
}
function callRun(target, replace) {
  return target.run(replace());
}
function callMethod(target, replace) {
  return target.method(replace());
}
function callGetter(target, replace) {
  return target.viaGetter(replace());
}
const holder = new Holder();
holder.run = () => "field-old";
console.log(
  callRun(holder, () => {
    holder.run = () => "field-new";
    return 0;
  }),
  holder.run(),
);
function callExtra(target, replace) {
  return target.extra(replace());
}
const later = new Holder();
later.extra = () => "added-old";
console.log(
  callExtra(later, () => {
    later.extra = () => "added-new";
    return 0;
  }),
  later.extra(),
);
const plain = { run: () => "plain-old" };
console.log(
  callRun(plain, () => {
    plain.run = () => "plain-new";
    return 0;
  }),
  plain.run(),
);
class Swapped {
  method() {
    return "method-old";
  }
}
console.log(
  callMethod(new Swapped(), () => {
    Swapped.prototype.method = () => "method-new";
    return 0;
  }),
  new Swapped().method(),
);
console.log(
  callGetter(new Holder(), () => {
    log.push("argument");
    return 0;
  }),
  log.join(","),
);
log.length = 0;
const accessorTarget = { run: () => "plain" };
Object.defineProperty(accessorTarget, "run", {
  get() {
    log.push("own-getter");
    return () => "own-accessor";
  },
  configurable: true,
});
console.log(
  callRun(accessorTarget, () => {
    log.push("argument");
    return 0;
  }),
  log.join(","),
);
class Box {
  constructor(value) {
    this.run = value;
  }
}
try {
  callRun(new Box(5), () => 0);
} catch (e) {
  console.log(e instanceof TypeError, e.message);
}
// A class field and a getter named like array methods do not change calls
// of those methods on arrays.
class Material {
  constructor() {
    this.map = null;
  }
  get filter() {
    return () => "material-filter";
  }
}
function doubled(items) {
  return items.map((x) => x * 2).filter((x) => x > 2);
}
console.log(new Material().map, new Material().filter(), doubled([1, 2, 3]).join(","));
