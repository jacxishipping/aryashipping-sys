import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: {
      loginCode: true,
    },
    where: {
      loginCode: {
        not: null,
      },
    },
  })

  let totalWithCode = 0
  let exactly8Digits = 0
  let length8WithOther = 0
  let otherLengths = 0

  for (const user of users) {
    const code = user.loginCode
    if (!code) continue

    totalWithCode++
    const is8Chars = code.length === 8
    const isAllDigits = /^\d+$/.test(code)

    if (is8Chars && isAllDigits) {
      exactly8Digits++
    } else if (is8Chars) {
      length8WithOther++
    } else {
      otherLengths++
    }
  }

  console.log(JSON.stringify({
    totalWithCode,
    exactly8Digits,
    length8WithOther,
    otherLengths
  }))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
