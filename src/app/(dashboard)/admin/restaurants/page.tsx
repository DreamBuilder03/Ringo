'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { POS_OPTIONS } from '@/lib/constants';

export default function AddRestaurantPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    posType: 'none',
    retellAgentId: '',
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // TODO: Replace with actual Supabase insert
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setLoading(false);
    setSuccess(true);
    setForm({ name: '', address: '', phone: '', posType: 'none', retellAgentId: '' });

    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <div className="max-w-2xl animate-fade-in">
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
            placeholder="123 Main St, Austin, TX 78701"
            value={form.address}
            onChange={(e) => updateField('address', e.target.value)}
            required
          />
          <Input
            id="phone"
            label="Phone Number"
            placeholder="(512) 555-1234"
            type="tel"
            value={form.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            required
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
            label="Retell Agent ID"
            placeholder="agent_xxxxxxxx"
            value={form.retellAgentId}
            onChange={(e) => updateField('retellAgentId', e.target.value)}
          />

          {success && (
            <div className="rounded-lg bg-emerald-400/10 border border-emerald-400/20 px-4 py-2 text-sm text-emerald-400">
              Restaurant added successfully!
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
