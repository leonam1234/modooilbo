import {
  GA4_ACTIVATION_AT,
  isGa4ActiveAt,
} from "../../src/lib/google-analytics";

export const onRequestGet: PagesFunction = () => {
  const serverNow = Date.now();

  return Response.json(
    {
      active: isGa4ActiveAt(serverNow),
      activationAt: GA4_ACTIVATION_AT,
      serverNow: new Date(serverNow).toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
};
