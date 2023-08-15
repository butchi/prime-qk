console.log("Hello, world!")

const boxHistoryElm = document.querySelector(".box-history")

const cmdBoxElm = document.querySelector("[data-box-command]")

const cmdInputElm = cmdBoxElm.querySelector("input")
const cmdBtnElm = cmdBoxElm.querySelector("button")

const outputTmpl = document.querySelector("#output")

const deckValArr = (new Array(13 * 4)).fill(0).map((_, i) => Math.floor(i / 4) + 1).concat([-1, -1])

deckValArr.sort(_ => Math.random() - .5)

const outputElmClone = outputTmpl.content.firstElementChild.cloneNode(true)


// http://blog.livedoor.jp/dankogai/archives/51854062.html
// TODO: 最大素数大富豪数まで対応
const primeBit16Arr = (sqrtmax => {
    const ret = [2];

    loop: for (let n = 3; n <= sqrtmax; n += 2) {
        for (let i = 0; i < ret.length; i++) {
            const p = ret[i];

            if (n % p === 0) continue loop;

            if (p * p > n) break;
        }
        ret.push(n);
    }

    return ret;
})(0xffff);

const factor = n => {
    if (n < 2) return undefined;

    const ret = [];

    for (let i = 0, l = primeBit16Arr.length; i < l; i++) {
        const p = primeBit16Arr[i];

        while (n % p === 0) {
            ret.push(p);
            n /= p;
        }

        if (n === 1) return ret;
    }

    if (n !== 1) ret.push(n);

    return ret;
};

const primeQ = n => {
    if (n == null) {
    } if (n < 2) {
        return false
    }

    if (isFinite(n)) {
        return factor(n).length === 1
    }
}



const toQkString = arg => {
    if (arg == null) {
        return ""
    } else if (typeof arg === "string") {
        const str = arg

        return toQkString(toQkArray(str))
    } else if (arg instanceof Array) {
        const arr = arg

        const ret = arr.map(num => {
            return ({
                "11": "J",
                "12": "Q",
                "13": "K",
                "10": "T",
                "-1": "X",
            }[num] || num.toString())
        }).join("")

        return ret
    }
}

const toQkNumber = arg => {
    if (arg == null) {
        return NaN
    } else if (typeof arg === "string") {
        const str = arg

        if (str.toUpperCase() === "X") {
            return Infinity
        }

        // TODO: ジョーカーの値を指定できるようにする
        const x = 1

        const ret = parseInt(str.toUpperCase().replaceAll("A", "1").replaceAll("T", "10").replaceAll("J", "11").replaceAll("Q", "12").replaceAll("K", "13").replaceAll("X", x))

        if (ret > Number.MAX_SAFE_INTEGER) {
            console.error(`${str} is not safe integer`)

            return NaN
        }

        return ret
    } else if (arg instanceof Array) {
        const arr = arg

        return toQkNumber(toQkString(arr))
    } else {
        return NaN
    }
}

const toQkArray = arg => {
    if (arg == null) {
        return []
    } else if (typeof arg === "string") {
        const str = arg

        // TODO: ジョーカーの値を指定できるようにする
        const x = 1

        const ret = str.split("").map(char => ({
            A: 1,
            T: 10,
            J: 11,
            Q: 12,
            K: 13,
        }[char.toUpperCase()] || parseInt(char.toUpperCase().replace("X", -x))))

        return ret
    }
}

const qkValueOf = n => {
    if (n < 0) {
        return Infinity
    }

    return n
}

const log = {
    info: html => {
        const elmClone = outputTmpl.content.firstElementChild.cloneNode(true)

        elmClone.querySelector("[data-slot]").innerHTML = html

        boxHistoryElm.appendChild(elmClone)
    }
}

const sortValArr = arr => arr.sort((a, b) => qkValueOf(a) - qkValueOf(b))

const handValArr = sortValArr(deckValArr.splice(0, 11))

outputElmClone.querySelector("[data-slot]").innerHTML = `<i class="bi-cash-stack"></i> ${toQkString(handValArr)}`

boxHistoryElm.appendChild(outputElmClone)

cmdBoxElm.addEventListener("submit", evt => {
    evt.preventDefault()

    const inputStr = cmdInputElm.value

    if (inputStr == null) {
        return
    } else if (inputStr === "") {
        return
    } else if (inputStr.toLowerCase() === "d") {
        cmdInputElm.value = ""

        handValArr.push(deckValArr.shift())

        sortValArr(handValArr)
    } else {
        const inputQkStr = toQkString(inputStr)

        const inputCardLen = inputQkStr.length

        const inputArr = toQkArray(inputQkStr)

        const handTmp = [...handValArr]

        const spliceIndexArr = inputArr.map(cardVal => {
            const index = handTmp.findIndex(handVal => handVal === cardVal)

            if (index >= 0) {
                handTmp.splice(index, 1)

                return index
            } else {
                return NaN
            }
        })

        if (spliceIndexArr.includes(NaN)) {
            return
        }

        const inputNum = toQkNumber(inputStr)

        const factorArr = factor(inputNum)

        let attackHtml = `<i class="bi-arrow-bar-up"></i> ${inputQkStr}`

        let isValid = false

        if (inputNum == null) {
        } else if (inputNum === Infinity) {
            attackHtml += ' <i class="bi-check"></i> <span class="badge bg-secondary">Joker</span>'

            isValid = true
        } else if (inputNum === 57) {
            attackHtml += ' <i class="bi-check"></i> <span class="badge bg-secondary">GC</span>'

            isValid = true
        } else if (primeQ(inputNum)) {
            attackHtml += ` <i class="bi-check-circle-fill"></i> <small>${inputNum} is Prime</small>`

            isValid = true
        } else if (isFinite(inputNum) && factorArr.length > 1) {
            attackHtml += ` <i class="bi-x-circle-fill"></i> <small>${inputNum} = ${factorArr.join(" × ")}</small>`

            const checkArr = [2, 3, 5, 11, 1001]

            checkArr.forEach(num => {
                if (inputNum % num === 0) {
                    attackHtml += ` <span class="badge bg-secondary">${num}n</span>`
                }
            })

            isValid = false
        } else {
            return
        }

        if (isValid) {
            spliceIndexArr.forEach(idx => {
                deckValArr.push(handValArr.splice(idx, 1)[0])
            })
        } else {
            for (let i = 0; i < inputCardLen; i++) {
                handValArr.push(deckValArr.shift())
            }
        }

        log.info(attackHtml)
    }

    sortValArr(handValArr)

    log.info(`<i class="bi-cash-stack"></i> ${toQkString(handValArr)}`)

    if (handValArr.length === 0) {
        log.info("Clear!")
    }

    cmdInputElm.value = ""
})

console.log("Thanks, world!")