import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, TrendingUp, Receipt, Calculator, Banknote, Coins, CreditCard, Wallet, LucideIcon } from 'lucide-react';

const FloatingIcon = ({ icon: Icon, delay, duration, startX, startY }: { 
  icon: LucideIcon; 
  delay: number; 
  duration: number;
  startX: string;
  startY: string;
}) => (
  <div
    className="absolute opacity-30 animate-float"
    style={{
      left: startX,
      top: startY,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
    }}
  >
    <Icon className="w-16 h-16 text-primary" />
  </div>
);

export const AuthLayout = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast({
          title: "Error al iniciar sesión",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Algo salió mal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const floatingIcons = [
    { icon: DollarSign, delay: 0, duration: 15, startX: '10%', startY: '20%' },
    { icon: TrendingUp, delay: 2, duration: 18, startX: '80%', startY: '30%' },
    { icon: Receipt, delay: 4, duration: 20, startX: '15%', startY: '70%' },
    { icon: Calculator, delay: 1, duration: 17, startX: '75%', startY: '60%' },
    { icon: Banknote, delay: 3, duration: 19, startX: '50%', startY: '10%' },
    { icon: Coins, delay: 5, duration: 16, startX: '25%', startY: '50%' },
    { icon: CreditCard, delay: 2.5, duration: 21, startX: '65%', startY: '80%' },
    { icon: Wallet, delay: 4.5, duration: 18, startX: '90%', startY: '50%' },
    { icon: DollarSign, delay: 1.5, duration: 19, startX: '5%', startY: '85%' },
    { icon: TrendingUp, delay: 3.5, duration: 17, startX: '92%', startY: '15%' },
    { icon: Coins, delay: 6, duration: 20, startX: '40%', startY: '90%' },
    { icon: Receipt, delay: 0.5, duration: 18, startX: '85%', startY: '70%' },
    { icon: Calculator, delay: 5.5, duration: 16, startX: '30%', startY: '5%' },
    { icon: Wallet, delay: 2, duration: 22, startX: '60%', startY: '40%' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Animated floating icons background */}
      {floatingIcons.map((item, index) => (
        <FloatingIcon key={index} {...item} />
      ))}
      
      <Card className="w-full max-w-md relative z-10 shadow-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Sistema de Loterías</CardTitle>
          <CardDescription className="text-center">
            Iniciar sesión
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Cargando...' : 'Iniciar sesión'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};