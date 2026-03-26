import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { BarChart3 } from "lucide-react";
import type { TrackingPoint } from "@/types/analysis";

interface ComparisonChartsProps {
  experimental: TrackingPoint[];
  theoretical: TrackingPoint[];
}

export function ComparisonCharts({ experimental, theoretical }: ComparisonChartsProps) {
  const posData = experimental.map((p, i) => ({
    t: +p.timestamp.toFixed(3),
    expX: +p.position.x.toFixed(4),
    expY: +p.position.y.toFixed(4),
    theoX: theoretical[i] ? +theoretical[i].position.x.toFixed(4) : null,
    theoY: theoretical[i] ? +theoretical[i].position.y.toFixed(4) : null,
  }));

  const velData = experimental
    .filter((p) => p.velocity)
    .map((p) => ({
      t: +p.timestamp.toFixed(3),
      expV: +p.velocity!.magnitude.toFixed(4),
    }));

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-accent" />
          Đồ thị so sánh
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="xt">
          <TabsList className="w-full">
            <TabsTrigger value="xt" className="flex-1">x(t)</TabsTrigger>
            <TabsTrigger value="yt" className="flex-1">y(t)</TabsTrigger>
            <TabsTrigger value="vt" className="flex-1">v(t)</TabsTrigger>
          </TabsList>

          <TabsContent value="xt">
            <div className="h-[300px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={posData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
                  <XAxis dataKey="t" label={{ value: "t (s)", position: "bottom" }} />
                  <YAxis label={{ value: "x", angle: -90, position: "left" }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="expX" name="Thực nghiệm" stroke="hsl(217, 71%, 35%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="theoX" name="Lý thuyết" stroke="hsl(200, 80%, 45%)" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="yt">
            <div className="h-[300px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={posData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
                  <XAxis dataKey="t" label={{ value: "t (s)", position: "bottom" }} />
                  <YAxis label={{ value: "y", angle: -90, position: "left" }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="expY" name="Thực nghiệm" stroke="hsl(217, 71%, 35%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="theoY" name="Lý thuyết" stroke="hsl(200, 80%, 45%)" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="vt">
            <div className="h-[300px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={velData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
                  <XAxis dataKey="t" label={{ value: "t (s)", position: "bottom" }} />
                  <YAxis label={{ value: "|v|", angle: -90, position: "left" }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="expV" name="Vận tốc" stroke="hsl(152, 60%, 40%)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
