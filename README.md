# VORA Smart Mobility

VORA is a Cameroon-first smart mobility app for finding safer, more affordable, and more practical ways to move around Yaoundé.

## Demo flow

1. Create an account with phone number, OTP, and name.
2. Complete your profile by choosing your usual pickup location.
3. Search Yaoundé landmarks such as Mokolo, Bastos, Etoudi, Omnisport, Rond Point Nlongkak, and Montée Jouvence.
4. Preview the route, distance, ETA, traffic, and transparent fare.
5. Choose VORA Solo, Share, or Accessible.
6. Review VORA Smart Choice, confirm the ride, and match with a verified driver.
7. Follow the simulated live trip, share the trip, use SOS, complete the ride, and rate the driver.

## Project structure

- `artifacts/vora-mobile` — Expo mobile app
- `lib` — shared workspace libraries
- `replit.md` — product and architecture notes

## Run locally

```bash
pnpm install
pnpm --filter @workspace/vora-mobile run dev
```

The first build uses local persistence with AsyncStorage so the complete hackathon demo runs without external service setup. Native devices request GPS permission; browser previews use a safe fallback location.