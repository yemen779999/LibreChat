## 2025-05-18 - Array length mutation in V8/JIT hot loops
**Learning:** Mutating `array.length` and shifting elements in-place inside V8/JIT hot loops can degrade performance compared to native array methods like `Array.prototype.filter` due to array representation deoptimizations (packed vs holey elements) in JS engines.
**Action:** Always benchmark array manipulations in JS/V8 before replacing native array methods with in-place index mutations.
