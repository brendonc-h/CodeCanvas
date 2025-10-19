import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", username: "", password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: z.infer<typeof loginSchema>) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Welcome back!" });
      // Force a page reload to ensure session is properly set
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: z.infer<typeof signupSchema>) => {
      const res = await apiRequest("POST", "/api/auth/signup", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Account created! Logging you in..." });
      // Force a page reload to ensure session is properly set
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <img src="/logo.png" alt="CurryStack" className="h-16 w-16" />
          </div>
          <CardTitle className="text-3xl font-bold">CurryStack</CardTitle>
          <CardDescription>Professional Web IDE - Sign in or create your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
              <TabsTrigger value="signup" data-testid="tab-signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" data-testid="input-login-email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" data-testid="input-login-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={loginMutation.isPending} data-testid="button-login">
                    {loginMutation.isPending ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="signup">
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit((data) => signupMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={signupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" data-testid="input-signup-email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signupForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="johndoe" data-testid="input-signup-username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" data-testid="input-signup-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={signupMutation.isPending} data-testid="button-signup">
                    {signupMutation.isPending ? "Creating account..." : "Sign Up"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
