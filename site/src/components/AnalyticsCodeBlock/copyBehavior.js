export async function copyCodeAndReport({code, copy, analyticsContext, report}) {
  const copied = await copy(code);
  if (copied === false) throw new Error('copy-failed');
  if (analyticsContext) report(analyticsContext);
}
