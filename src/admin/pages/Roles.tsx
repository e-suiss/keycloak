// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminClient } from "../admin-client";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Spinner } from "@ui/components/spinner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@ui/components/table";
import { useRealm } from "../ui/realm";

export default function Roles() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [roles, setRoles] = useState<any[]>([]);
    const [filter, setFilter] = useState("");

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                const result = await adminClient.roles.find().catch(() => []);
                if (!alive) return;
                setRoles(result ?? []);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient]);

    const filtered = useMemo(() => {
        const q = filter.trim().toLowerCase();
        const sorted = [...roles].sort((a, b) =>
            (a.name || "").localeCompare(b.name || "")
        );
        if (!q) return sorted;
        return sorted.filter(
            r =>
                (r.name || "").toLowerCase().includes(q) ||
                (r.description || "").toLowerCase().includes(q)
        );
    }, [roles, filter]);

    const go = (r: any) => navigate(`/${realm}/roles/${encodeURIComponent(r.name)}`);

    const rows = filtered.map(r => [
        <Button variant="link" className="h-auto p-0" onClick={() => go(r)}>
            {r.name}
        </Button>,
        <span className="cursor-pointer" onClick={() => go(r)}>
            {r.description || "—"}
        </span>,
        <span className="cursor-pointer" onClick={() => go(r)}>
            {r.composite ? (
                <Badge variant="outline">Bileşik</Badge>
            ) : (
                <Badge variant="secondary">Tekil</Badge>
            )}
        </span>
    ]);

    return (
        <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
                <Button onClick={() => navigate(`/${realm}/roles/new`)}>Yeni rol</Button>
            </div>
            {loading ? (
                <div className="grid place-items-center py-16">
                    <Spinner />
                </div>
            ) : (
                <div className="space-y-4">
                    <Input
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        placeholder="Rol ara…"
                        className="max-w-sm"
                    />
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Rol</TableHead>
                                <TableHead>Açıklama</TableHead>
                                <TableHead>Tür</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={3}
                                        className="py-10 text-center text-muted-foreground"
                                    >
                                        Rol bulunamadı.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((cells, i) => (
                                    <TableRow key={i}>
                                        {cells.map((c, j) => (
                                            <TableCell key={j}>{c}</TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
