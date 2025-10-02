'use client'

import React, { useState } from 'react'
import { CreditCard, Clock, Star, Gift, Calendar, DollarSign, ChevronRight, Download, FileText, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { getCurrentUser } from '@/lib/userAuth'

export default function PurchasesPage() {
  const currentUser = getCurrentUser()
  const [activeSection, setActiveSection] = useState<'memberships' | 'purchases' | 'payment-methods' | 'billing' | null>(null)

  // Real data - will be connected to payment gateway
  const mockMemberships: any[] = [] // No memberships yet - will populate when payment gateway is integrated

  const mockPurchases: any[] = [] // No purchases yet - will populate when payment gateway is integrated

  const mockPaymentMethods: any[] = [] // No payment methods yet - will populate when payment gateway is integrated

  const sections = [
    {
      id: 'memberships' as const,
      icon: Star,
      title: 'Channel Memberships',
      description: 'Active memberships and subscriptions',
      count: mockMemberships.length
    },
    {
      id: 'purchases' as const,
      icon: DollarSign,
      title: 'Purchase History',
      description: 'Videos, rentals, and other purchases',
      count: mockPurchases.length
    },
    {
      id: 'payment-methods' as const,
      icon: CreditCard,
      title: 'Payment Methods',
      description: 'Manage your payment cards and methods',
      count: mockPaymentMethods.length
    },
    {
      id: 'billing' as const,
      icon: FileText,
      title: 'Billing & Receipts',
      description: 'View and download invoices',
      count: 0
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Purchases & Memberships</h1>
          <p className="text-muted-foreground">
            Manage your subscriptions, purchases, and payment methods
          </p>
        </div>

        <div className="mb-8 space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card/80 p-6 dark:border-white/10 dark:bg-card/60">
            <h3 className="mb-4 text-lg font-semibold">Loottube Payment Structure</h3>
            <div className="space-y-4">
              <div className="rounded-xl border border-border/40 bg-background/50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">1. Creator Memberships (Patreon Style)</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Support your favorite creators with custom membership tiers
                </p>
                <p className="text-sm font-medium text-primary">
                  ✓ 99% revenue goes to content creators
                </p>
                <p className="text-xs text-muted-foreground">
                  Creators set their own prices and benefits
                </p>
              </div>

              <div className="rounded-xl border border-border/40 bg-background/50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">2. Video Ad Revenue</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Ads shown on videos generate revenue for creators
                </p>
                <p className="text-sm font-medium text-primary">
                  ✓ 99% revenue goes to content creators
                </p>
              </div>

              <div className="rounded-xl border border-border/40 bg-background/50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">3. Platform Support</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Help keep Loottube running and ad-free
                </p>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-primary">
                    • $12/year suggested donation
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Or donate what you can - every bit helps!
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-6 dark:bg-primary/10">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-primary">Why 99% to Creators?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  We believe creators deserve nearly all the revenue they generate. The 1% covers payment processing fees only.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <Dialog key={section.id} open={activeSection === section.id} onOpenChange={(open) => setActiveSection(open ? section.id : null)}>
                <Button
                  variant="ghost"
                  className="flex h-auto w-full items-center justify-between rounded-2xl border border-border/60 bg-card/80 p-6 text-left transition-all hover:border-primary/40 hover:shadow-md dark:border-white/10 dark:bg-card/60"
                  onClick={() => setActiveSection(section.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{section.title}</h3>
                        {section.count > 0 && (
                          <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                            {section.count}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Button>

                <DialogContent className="sm:max-w-[600px] w-[calc(100vw-2rem)] max-h-[85vh] rounded-xl bg-background text-foreground sm:rounded-2xl">
                  <div className="max-h-[75vh] overflow-y-auto pr-1">
                    <DialogTitle className="mb-6 text-2xl font-bold">{section.title}</DialogTitle>
                    <DialogDescription className="sr-only">{section.description}</DialogDescription>

                    {section.id === 'memberships' && (
                      <div className="space-y-4">
                        {mockMemberships.length > 0 ? (
                          mockMemberships.map((membership) => (
                            <div key={membership.id} className="rounded-2xl border border-border/60 bg-card/50 p-6">
                              <div className="mb-4 flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold">{membership.channelName}</h4>
                                  <p className="text-sm text-muted-foreground">{membership.channelHandle}</p>
                                </div>
                                <div className="rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-primary">
                                  {membership.tier}
                                </div>
                              </div>

                              <div className="mb-4 grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Price</p>
                                  <p className="font-semibold">{membership.price}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Next Billing</p>
                                  <p className="font-semibold">{membership.nextBilling}</p>
                                </div>
                              </div>

                              <div className="mb-4">
                                <p className="mb-2 text-sm font-medium">Member Benefits</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {membership.benefits.map((benefit, index) => (
                                    <div key={index} className="flex items-center gap-2 text-sm">
                                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                      {benefit}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button variant="outline" className="flex-1 rounded-full">
                                  Manage
                                </Button>
                                <Button variant="outline" className="flex-1 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive">
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-border/60 bg-card/50 p-8 text-center">
                            <Star className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                            <h4 className="mb-2 font-semibold">No Active Memberships</h4>
                            <p className="mb-4 text-sm text-muted-foreground">
                              Creator memberships will be available once payment gateway is integrated. Support your favorite creators with custom membership tiers - 99% goes to creators!
                            </p>
                            <Button variant="outline" className="rounded-full" disabled>
                              Coming Soon
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {section.id === 'purchases' && (
                      <div className="space-y-4">
                        {mockPurchases.length > 0 ? (
                          mockPurchases.map((purchase) => (
                            <div key={purchase.id} className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/50 p-4">
                              <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                  {purchase.type === 'Video Rental' ? (
                                    <Download className="h-5 w-5 text-primary" />
                                  ) : (
                                    <Gift className="h-5 w-5 text-primary" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium">{purchase.title}</p>
                                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <span>{purchase.type}</span>
                                    <span>•</span>
                                    <span>{purchase.date}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">{purchase.amount}</p>
                                <p className="text-sm text-muted-foreground">{purchase.status}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-border/60 bg-card/50 p-8 text-center">
                            <DollarSign className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                            <h4 className="mb-2 font-semibold">No Purchases Yet</h4>
                            <p className="text-sm text-muted-foreground">
                              Purchase history will be available once payment gateway is integrated
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {section.id === 'payment-methods' && (
                      <div className="space-y-4">
                        {mockPaymentMethods.map((method) => (
                          <div key={method.id} className="rounded-2xl border border-border/60 bg-card/50 p-6">
                            <div className="mb-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                  <CreditCard className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-semibold">{method.type} •••• {method.last4}</p>
                                  <p className="text-sm text-muted-foreground">Expires {method.expiry}</p>
                                </div>
                              </div>
                              {method.isDefault && (
                                <div className="rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-primary">
                                  Default
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" className="flex-1 rounded-full">
                                Edit
                              </Button>
                              <Button variant="outline" className="flex-1 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive">
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button variant="outline" className="w-full rounded-full">
                          <CreditCard className="mr-2 h-5 w-5" />
                          Add Payment Method
                        </Button>
                      </div>
                    )}

                    {section.id === 'billing' && (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-border/60 bg-card/50 p-8 text-center">
                          <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                          <h4 className="mb-2 font-semibold">No Invoices Available</h4>
                          <p className="mb-4 text-sm text-muted-foreground">
                            Your billing history and receipts will appear here
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
                          <h4 className="mb-4 font-semibold">Billing Information</h4>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-muted-foreground">Billing Email</p>
                              <p className="font-medium">{currentUser?.email}</p>
                            </div>
                            <Button variant="outline" className="w-full rounded-full">
                              Update Billing Info
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )
          })}
        </div>
      </div>
    </div>
  )
}
