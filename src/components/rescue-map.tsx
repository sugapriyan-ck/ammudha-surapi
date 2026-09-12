"use client";

import { useEffect, useRef } from "react";
import { getUrgencyInfo, countdownText } from "@/lib/rescue-score";
import type { FoodListing } from "@/lib/types";

const DEFAULT_CENTER: [number, number] = [13.0827, 80.2707];

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;"
  );
}

/**
 * Clean, functional map of nearby available food listings.
 * Markers carry the urgency tier (critical / at risk / low) and open the
 * matching listing card via an anchor scroll.
 */
export function RescueMap({
  listings,
  userLat,
  userLng,
}: {
  listings: FoodListing[];
  userLat?: number | null;
  userLng?: number | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").LayerGroup | null>(null);

  useEffect(() => {
    let disposed = false;

    void (async () => {
      const L = await import("leaflet");
      if (disposed || !containerRef.current) return;

      let map = mapRef.current;
      if (!map) {
        map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(DEFAULT_CENTER, 13);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);
        markersRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
      }

      const layer = markersRef.current;
      if (!layer) return;
      layer.clearLayers();

      const center: [number, number] =
        userLat != null && userLng != null ? [userLat, userLng] : DEFAULT_CENTER;
      map.setView(center, 13);

      if (userLat != null && userLng != null) {
        L.circleMarker(center, {
          radius: 5,
          color: "#D96C5B",
          weight: 2,
          fillColor: "#fff",
          fillOpacity: 1,
        }).addTo(layer);
      }

      const now = new Date();
      for (const l of listings) {
        const u = getUrgencyInfo(l.pickup_deadline, now);
        if (u.minutesLeft <= 0) continue;
        const color = u.tier === "critical" ? "#D96C5B" : u.tier === "at_risk" ? "#E2A24B" : "#7EA172";
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:15px;height:15px;border-radius:9999px;background:${color};border:2.5px solid #fff;box-shadow:0 1px 4px rgba(46,46,46,0.4);"></div>`,
          iconSize: [15, 15],
          iconAnchor: [7.5, 7.5],
        });
        const marker = L.marker([l.lat, l.lng], { icon });
        marker.bindPopup(
          `<div style="font-family:inherit;min-width:160px;">
            <div style="font-weight:700;color:#2E2E2E;">${escapeHtml(l.food_name)}</div>
            <div style="font-size:12px;color:#6b6b6b;margin-top:2px;">${l.quantity} ${escapeHtml(
              l.unit
            )} · ${escapeHtml(l.category)}</div>
            <div style="font-size:12px;color:#6b6b6b;">${countdownText(u.minutesLeft)}</div>
            <a href="#listing-${l.id}" style="display:inline-block;margin-top:6px;font-size:12px;font-weight:600;color:#E2725B;">View listing</a>
          </div>`
        );
        marker.addTo(layer);
      }
    })();

    return () => {
      disposed = true;
    };
  }, [listings, userLat, userLng]);

  useEffect(() => {
    return () => {
      const map = mapRef.current;
      if (map) {
        map.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} className="h-[340px] w-full bg-warm-cream" aria-label="Map of nearby food listings" />;
}