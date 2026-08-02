"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Input } from "@/components/ui";

export type DonorProfileFormValues = {
  orgName: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
};

type Props = {
  initial: DonorProfileFormValues;
  isNew: boolean;
};

export function DonorProfileForm({ initial, isNew }: Props) {
  const router = useRouter();
  const [orgName, setOrgName] = useState(initial.orgName);
  const [address, setAddress] = useState(initial.address);
  const [lat, setLat] = useState(String(initial.lat));
  const [lng, setLng] = useState(String(initial.lng));
  const [phone, setPhone] = useState(initial.phone);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      setError("Latitude and longitude must be valid numbers.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/donor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName: orgName.trim(),
          address: address.trim(),
          lat: latNum,
          lng: lngNum,
          phone: phone.trim() || null,
        }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Could not save profile.";
        setError(message);
        return;
      }

      setSuccess(isNew ? "Profile created." : "Profile updated.");
      router.refresh();
      if (isNew) {
        router.push("/donor");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="orgName" className="block text-sm font-medium text-ink">
          Organization name
        </label>
        <Input
          id="orgName"
          name="orgName"
          required
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          placeholder="Whiskey Row Kitchen"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="address" className="block text-sm font-medium text-ink">
          Pickup address
        </label>
        <Input
          id="address"
          name="address"
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="101 W Main St, Louisville, KY 40202"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="lat" className="block text-sm font-medium text-ink">
            Latitude
          </label>
          <Input
            id="lat"
            name="lat"
            required
            inputMode="decimal"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="lng" className="block text-sm font-medium text-ink">
            Longitude
          </label>
          <Input
            id="lng"
            name="lng"
            required
            inputMode="decimal"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="phone" className="block text-sm font-medium text-ink">
          Contact phone
        </label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="502-555-0101"
        />
        <p className="text-xs text-ink-muted">
          Shown to recipients only after they claim a listing.
        </p>
      </div>

      {error ? (
        <Alert variant="error" title="Could not save">
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert variant="success" title="Saved">
          {success}
        </Alert>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Saving…" : isNew ? "Create profile" : "Save changes"}
      </Button>
    </form>
  );
}
