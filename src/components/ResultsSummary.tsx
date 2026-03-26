import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, TrendingUp, Target } from "lucide-react";
import { MOTION_TYPES, type AnalysisResult } from "@/types/analysis";

interface ResultsSummaryProps {
  result: AnalysisResult;
}

export function ResultsSummary({ result }: ResultsSummaryProps) {
  const motionInfo = MOTION_TYPES[result.motionType];

  return (
    <div className="space-y-4">
      {/* Motion Type Card */}
      <Card className="glass-card border-l-4 border-l-accent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-5 h-5 text-accent" />
            Kết quả nhận diện
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge className="gradient-primary text-primary-foreground text-sm px-3 py-1">
              {motionInfo.labelVi}
            </Badge>
            <span className="text-sm text-muted-foreground">{motionInfo.label}</span>
            <Badge variant="outline" className="ml-auto font-mono">
              {(result.confidence * 100).toFixed(0)}% tin cậy
            </Badge>
          </div>

          <div className="rounded-md bg-muted/50 p-3 font-mono text-sm">
            {motionInfo.formula}
          </div>

          <p className="text-sm text-muted-foreground">{result.aiDescription}</p>
        </CardContent>
      </Card>

      {/* Parameters Table */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            Thông số vật lý
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thông số</TableHead>
                <TableHead className="text-right">Giá trị</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(result.parameters).map(([key, value]) => (
                <TableRow key={key}>
                  <TableCell className="font-mono text-sm">{key}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {typeof value === "number" ? value.toFixed(4) : value}
                  </TableCell>
                </TableRow>
              ))}
              {result.errorPercent !== undefined && (
                <TableRow>
                  <TableCell className="font-semibold">Sai số</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-warning">
                    {result.errorPercent.toFixed(2)}%
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            Bảng số liệu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[300px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>t (s)</TableHead>
                  <TableHead>x</TableHead>
                  <TableHead>y</TableHead>
                  <TableHead>|v|</TableHead>
                  <TableHead>|a|</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.trackingPoints.map((p) => (
                  <TableRow key={p.frameIndex}>
                    <TableCell className="font-mono text-xs">{p.frameIndex}</TableCell>
                    <TableCell className="font-mono text-xs">{p.timestamp.toFixed(3)}</TableCell>
                    <TableCell className="font-mono text-xs">{p.position.x.toFixed(4)}</TableCell>
                    <TableCell className="font-mono text-xs">{p.position.y.toFixed(4)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {p.velocity ? p.velocity.magnitude.toFixed(4) : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {p.acceleration ? p.acceleration.magnitude.toFixed(4) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
