// Not role="status": the pages already use that role for "Loading…".
export default function RatesNotice() {
  return <p role="note">Some amounts use an older exchange rate because current rates are unavailable.</p>;
}
