export const toNumber = (val: unknown): number | null => {
    if (val === undefined || val === null || val === '') return null

    const target = Array.isArray(val) ? val[0] : val
    const parsed = Number(target)

    // التأكد من أن الناتج رقم صالح وليس NaN
    return Number.isNaN(parsed) ? null : parsed
}