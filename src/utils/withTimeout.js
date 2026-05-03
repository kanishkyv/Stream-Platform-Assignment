async function withTimeout(promise, ms, errorCode = "TIMEOUT") {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => {
      const err = new Error(`Timed out after ${ms}ms`);
      err.code = errorCode;
      reject(err);
    }, ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(t);
  }
}

module.exports = { withTimeout };

