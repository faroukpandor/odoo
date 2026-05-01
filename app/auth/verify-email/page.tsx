"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function VerifyEmailPage() {
  return (
    <Card className="border-slate-700 bg-slate-900/50">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl text-slate-50">Check Your Email</CardTitle>
        <CardDescription className="text-slate-400">We&apos;ve sent you a verification link</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-slate-300">
          Please click the link in your email to verify your account. Once verified, you can start using Nexus.
        </p>
        <Link href="/auth/login">
          <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
            Back to Login
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
