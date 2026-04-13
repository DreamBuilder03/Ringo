'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { POS_OPTIONS } from '@/lib/constants';

export default function AddRestaurantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    posType: 'none',
    retellAgentId: '',
    retellAgentIdEs: '',
    preferredLanguage: 'en',
    ownerEmail: '',
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          address: form.address,
          phone: form.phone,
          pos_type: form.posType,
          retell_agent_id: form.retellAgentId || null,
          retell_agent_id_es: form.retellAgentIdEs || null,
          preferred_language: form.preferredLanguage,
          owner_email: form.ownerEmail || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create restaurant');
      }

      setSuccess(true);
      setForm({ name: '', address: '', phone: '', posType: 'none', retellAgentId: '', retellAgentIdEs: '', preferredLanguage: 'en', ownerEmail: '' });

      // Redirect to admin page after brief success message
      setTimeout(() => router.push('/admin'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl animate-fade-in">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-ringo-muted hover:text-foreground transition-colors mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Admin
      </Link>

      <h1 className="text-2xl font-semibold text-foreground mb-2">Add New Restaurant</h1>
      <p className="text-sm text-ringo-muted mb-6">
        Register a new restaurant location for Ringo AI ordering
      </p>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="name"
            label="Restaurant Name"
            placeholder="Mario's Pizza"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
          />
          <Input
            id="address"
            label="Address"
            placeholder="123 Main St, Modesto, CA 95354"
            value={form.address}
            onChange={(e) => updateField('address', e.target.value)}
            required
          />
          <Input
            id="phone"
            label="Phone Number"
            placeholder="(209) 555-1234"
            type="tel"
            value={form.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            required
          />
          <Input
            id="ownerEmail"
            label="Owner Email (optional)"
            placeholder="owner@restaurant.com"
            type="email"
            value={form.ownerEmail}
            onChange={(e) => updateField('ownerEmail', e.target.value)}
          />
          <Select
            id="posType"
            label="POS System"
            options={POS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={form.posType}
            onChange={(e) => updateField('posType', e.target.value)}
          />
          <Input
            id="retellAgentId"
            label="Retell Agent ID (English)"
            placeholder="agent_xxxxxxxx"
            value={form.retellAgentId}
            onChange={(e) => updateField('retellAgentId', e.target.value)}
          />
          <Select
            id="preferredLanguage"
            label="Preferred Language"
            options={[
              { value: 'en', label: 'English Only' },
              { value: 'es', label: 'Spanish Only' },
              { value: 'both', label: 'Both English & Spanish' },
            ]}
            value={form.preferredLanguage}
            onChange={(e) => updateField('preferredLanguage', e.target.value)}
          />
          {(form.preferredLanguage === 'es' || form.preferredLanguage === 'both') && (
            <Input
              id="retellAgentIdEs"
              label="Retell Agent ID (Spanish)"
              placeholder="agent_xxxxxxxx"
              value={form.retellAgentIdEs}
              onChange={(e) => updateField('retellAgentIdEs', e.target.value)}
              required={form.preferredLanguage === 'es' || form.preferredLanguage === 'both'}
            />
          )}

          {success && (
            <div className="rounded-lg bg-emerald-400/10 border border-emerald-400/20 px-4 py-2 text-sm text-emerald-400">
              Restaurant added successfully! Redirecting...
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-400/10 border border-red-400/20 px-4 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} size="lg" className="w-full">
            Add Restaurant
          </Button>
        </form>
      </Card>
    </div>
  );
}
