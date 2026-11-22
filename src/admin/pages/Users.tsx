// @ts-nocheck
import { useEffect, useState } from "react";
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

const PAGE_SIZE = 20;

export default function Users() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [first, setFirst] = useState(0);
    const [query, setQuery] = useState("");
    const [search, setSearch] = useState("");

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                const result = await adminClient.users
                    .find({ first, max: PAGE_SIZE, search: search || undefined })
                    .catch(() => []);
                if (!alive) return;
                setUsers(result);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [adminClient, first, search]);

    const applySearch = () => {
        setFirst(0);
        setSearch(query.trim());
    };

    const page = Math.floor(first / PAGE_SIZE) + 1;
    const hasPrev = first > 0;
    const hasNext = users.length >= PAGE_SIZE;

    return (
        <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
                <div className="flex items-center gap-2">
                    <div className="w-full max-w-sm">
                        <Input
                            placeholder="Kullanıcı ara…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === "Enter") applySearch();
                            }}
                        />
                    </div>
                    <Button variant="secondary" onClick={applySearch}>
                        Ara
                    </Button>
                    <Button onClick={() => navigate(`/${realm}/users/new`)}>
                        Yeni kullanıcı
                    </Button>
                </div>
            </div>
            {loading ? (
                <div className="grid place-items-center py-16">
                    <Spinner />
                </div>
            ) : (
                <div className="space-y-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Kullanıcı</TableHead>
                                <TableHead>E-posta</TableHead>
                                <TableHead>Ad Soyad</TableHead>
                                <TableHead>Durum</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        className="py-10 text-center text-muted-foreground"
                                    >
                                        {search
                                            ? "Aramayla eşleşen kullanıcı yok."
                                            : "Kullanıcı yok."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((u, i) => {
                                    const fullName =
                                        `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
                                    const open = () =>
                                        u.id && navigate(`/${realm}/users/${u.id}`);
                                    return (
                                        <TableRow key={u.id ?? i}>
                                            <TableCell>
                                                <div className="min-w-0">
                                                    <Button
                                                        variant="link"
                                                        className="h-auto max-w-full p-0"
                                                        onClick={open}
                                                    >
                                                        <span className="truncate">
                                                            {u.username}
                                                        </span>
                                                    </Button>
                                                    {u.id && (
                                                        <div className="truncate text-xs text-muted-foreground">
                                                            {u.id}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{u.email || "—"}</TableCell>
                                            <TableCell>{fullName || "—"}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <Badge
                                                        variant={
                                                            u.enabled
                                                                ? "outline"
                                                                : "destructive"
                                                        }
                                                    >
                                                        {u.enabled ? "Etkin" : "Devre dışı"}
                                                    </Badge>
                                                    {u.email && !u.emailVerified && (
                                                        <Badge variant="outline">
                                                            E-posta doğrulanmadı
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>

                    <div className="flex items-center justify-end gap-3">
                        <span className="text-sm text-muted-foreground">sayfa {page}</span>
                        <Button
                            variant="ghost"
                            disabled={!hasPrev}
                            onClick={() => setFirst(f => Math.max(0, f - PAGE_SIZE))}
                        >
                            Önceki
                        </Button>
                        <Button
                            variant="ghost"
                            disabled={!hasNext}
                            onClick={() => setFirst(f => f + PAGE_SIZE)}
                        >
                            Sonraki
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
