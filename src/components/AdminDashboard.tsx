import React, { useEffect, useState, useMemo } from "react";
import {
  collection, doc, updateDoc, deleteDoc, onSnapshot,
} from "firebase/firestore";
import { db, auth, logout } from "../lib/firebase";
import { useAdmin } from "../hooks/useAdmin";
import {
  Users, ShieldCheck, ShieldOff, Trash2, RefreshCw,
  Search, LogOut, ArrowUpDown, UserCheck, CalendarDays,
  ChevronUp, ChevronDown, Crown, Filter, ChevronLeft, ChevronRight,
} from "lucide-react";

type UserProfile = {
  id: string;
  email: string;
  displayName?: string;
  role: "user" | "admin";
  createdAt?: { seconds: number } | string;
  lastLoginAt?: { seconds: number } | string;
  isDeleted?: boolean;
  deletedAt?: { seconds: number } | string;
};

type SortKey = "email" | "displayName" | "role" | "createdAt";
type SortDir = "asc" | "desc";
type RoleFilter = "all" | "admin" | "user";
type DateFilter = "all" | "today" | "7days" | "30days" | "custom";
type PageSize = 20 | 50;

function formatDate(val?: { seconds: number } | string): string {
  if (!val) return "—";
  const ts = typeof val === "object" && "seconds" in val
    ? new Date(val.seconds * 1000)
    : new Date(val as string);
  if (isNaN(ts.getTime())) return "—";
  return ts.toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" });
}

function getInitial(profile: UserProfile) {
  return (profile.displayName || profile.email || "?")[0].toUpperCase();
}

function isNewThisWeek(val?: { seconds: number } | string): boolean {
  if (!val) return false;
  const ts = typeof val === "object" && "seconds" in val
    ? new Date(val.seconds * 1000)
    : new Date(val as string);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return ts > weekAgo;
}

export default function AdminDashboard() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("email");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // New filter states
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customDateStart, setCustomDateStart] = useState("");
  const [customDateEnd, setCustomDateEnd] = useState("");
  
  // Pagination
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [currentPage, setCurrentPage] = useState(1);

  // onSnapshot — plain collection, filtrowanie po stronie klienta
  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, "userProfiles"),
      (snap) => {
        setUsers(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<UserProfile, "id">) })));
        setLoading(false);
      },
      (err) => {
        setError(err.message || "Błąd pobierania użytkowników");
        setLoading(false);
      }
    );
    return unsub;
  }, [isAdmin]);

  const filterByDate = (user: UserProfile): boolean => {
    if (dateFilter === "all") return true;
    if (!user.createdAt) return false;
    const userDate = typeof user.createdAt === "object" && "seconds" in user.createdAt
      ? new Date(user.createdAt.seconds * 1000)
      : new Date(user.createdAt as string);
    const now = new Date();
    if (dateFilter === "today") return userDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (dateFilter === "7days") return userDate >= new Date(now.getTime() - 7 * 864e5);
    if (dateFilter === "30days") return userDate >= new Date(now.getTime() - 30 * 864e5);
    if (dateFilter === "custom" && customDateStart && customDateEnd) {
      const end = new Date(customDateEnd); end.setHours(23, 59, 59, 999);
      return userDate >= new Date(customDateStart) && userDate <= end;
    }
    return true;
  };

  const allFiltered = useMemo(() => {
    const q = search.toLowerCase();
    return users
      .filter(u => !u.isDeleted)
      .filter(u =>
        (u.email?.toLowerCase().includes(q) ||
         u.displayName?.toLowerCase().includes(q) ||
         u.id.toLowerCase().includes(q)) &&
        (roleFilter === "all" || u.role === roleFilter) &&
        filterByDate(u)
      )
      .sort((a, b) => {
        if (sortKey === "createdAt") {
          const ts = (v?: { seconds: number } | string) =>
            !v ? 0 : typeof v === "object" && "seconds" in v ? v.seconds : new Date(v as string).getTime() / 1000;
          return sortDir === "asc" ? ts(a.createdAt) - ts(b.createdAt) : ts(b.createdAt) - ts(a.createdAt);
        }
        const av = (a[sortKey] ?? "").toLowerCase();
        const bv = (b[sortKey] ?? "").toLowerCase();
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, search, sortKey, sortDir, roleFilter, dateFilter, customDateStart, customDateEnd]);

  const totalPages = Math.max(1, Math.ceil(allFiltered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const filtered = allFiltered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const stats = useMemo(() => {
    const active = users.filter(u => !u.isDeleted);
    return {
      total: active.length,
      admins: active.filter(u => u.role === "admin").length,
      newThisWeek: active.filter(u => isNewThisWeek(u.createdAt)).length,
    };
  }, [users]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown size={13} className="text-gray-400" />;
    return sortDir === "asc" ? <ChevronUp size={13} className="text-indigo-500" /> : <ChevronDown size={13} className="text-indigo-500" />;
  };

  const promoteToAdmin = async (userId: string) => {
    setActionLoading(userId + "_promote");
    try { await updateDoc(doc(db, "userProfiles", userId), { role: "admin" }); }
    catch (e: any) { setError(e.message); }
    finally { setActionLoading(null); }
  };

  const demoteFromAdmin = async (userId: string) => {
    setActionLoading(userId + "_demote");
    try { await updateDoc(doc(db, "userProfiles", userId), { role: "user" }); }
    catch (e: any) { setError(e.message); }
    finally { setActionLoading(null); }
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`Usuń użytkownika ${email}?`)) return;
    setActionLoading(userId + "_delete");
    try {
      await updateDoc(doc(db, "userProfiles", userId), {
        isDeleted: true, deletedAt: new Date().toISOString(),
      });
    } catch (e: any) { setError(e.message); }
    finally { setActionLoading(null); }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  if (adminLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 text-sm">Sprawdzanie uprawnień...</p>
      </div>
    </div>
  );

  if (!isAdmin) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-2">
        <p className="text-2xl font-bold text-red-500">Brak dostępu</p>
        <p className="text-gray-500 text-sm">Tylko administrator może wyświetlić tę stronę.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Crown size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-xs text-gray-400">LifeFlow — panel administratora</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-3 py-2 text-xs text-green-600 bg-green-50 rounded-lg font-semibold">
              <RefreshCw size={12} className="animate-spin" /> Live
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition"
            >
              <LogOut size={14} />
              Wyloguj
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Users size={18} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Wszyscy użytkownicy</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <ShieldCheck size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.admins}</p>
              <p className="text-xs text-gray-500">Administratorzy</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <CalendarDays size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.newThisWeek}</p>
              <p className="text-xs text-gray-500">Nowi w tym tygodniu</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={16} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Filtry</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Role Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Rola</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="all">Wszyscy</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
            </div>
            
            {/* Date Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Okres</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="all">Wszystkie</option>
                <option value="today">Dziś</option>
                <option value="7days">Ostatnie 7 dni</option>
                <option value="30days">Ostatnie 30 dni</option>
                <option value="custom">Zakres</option>
              </select>
            </div>
            
            {/* Custom Date Range */}
            {dateFilter === "custom" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Od</label>
                  <input
                    type="date"
                    value={customDateStart}
                    onChange={(e) => setCustomDateStart(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Do</label>
                  <input
                    type="date"
                    value={customDateEnd}
                    onChange={(e) => setCustomDateEnd(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </>
            )}
            
            {/* Page Size */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Na stronę</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) as PageSize)}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Szukaj po emailu, nazwie lub UID..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          {search && (
            <p className="mt-2 text-xs text-gray-400">
              Znaleziono: {allFiltered.length} z {stats.total}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-10">#</th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort("email")} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800">
                      Email <SortIcon k="email" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort("displayName")} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800">
                      Nazwa <SortIcon k="displayName" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort("role")} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800">
                      Rola <SortIcon k="role" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort("createdAt")} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800">
                      Dołączył <SortIcon k="createdAt" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">UID</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Ładowanie...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                      <UserCheck size={32} className="mx-auto mb-2 opacity-40" />
                      Brak użytkowników
                    </td>
                  </tr>
                ) : filtered.map((user, i) => {
                  const isCurrentAdmin = auth.currentUser?.uid === user.id;
                  return (
                    <tr key={user.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${user.role === "admin" ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"}`}>
                            {getInitial(user)}
                          </div>
                          <span className="font-medium text-gray-800 truncate max-w-[180px]">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{user.displayName || "—"}</td>
                      <td className="px-4 py-3">
                        {user.role === "admin" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                            <Crown size={10} /> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                            User
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className="text-gray-300 font-mono text-[10px] truncate block max-w-[90px]" title={user.id}>
                          {user.id.slice(0, 8)}…
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {user.role !== "admin" ? (
                            <button
                              onClick={() => promoteToAdmin(user.id)}
                              disabled={!!actionLoading}
                              title="Nadaj uprawnienia admina"
                              className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold hover:bg-amber-100 transition disabled:opacity-50"
                            >
                              {actionLoading === user.id + "_promote"
                                ? <div className="w-3 h-3 border border-amber-600 border-t-transparent rounded-full animate-spin" />
                                : <ShieldCheck size={12} />
                              }
                              Admin
                            </button>
                          ) : !isCurrentAdmin ? (
                            <button
                              onClick={() => demoteFromAdmin(user.id)}
                              disabled={!!actionLoading}
                              title="Odbierz uprawnienia admina"
                              className="flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-100 transition disabled:opacity-50"
                            >
                              {actionLoading === user.id + "_demote"
                                ? <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                                : <ShieldOff size={12} />
                              }
                              User
                            </button>
                          ) : (
                            <span className="text-xs text-gray-300 px-2">Ty</span>
                          )}
                          {!isCurrentAdmin && (
                            <button
                              onClick={() => deleteUser(user.id, user.email)}
                              disabled={!!actionLoading}
                              title="Usuń użytkownika"
                              className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition disabled:opacity-50"
                            >
                              {actionLoading === user.id + "_delete"
                                ? <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                                : <Trash2 size={12} />
                              }
                              Usuń
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!loading && allFiltered.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <div className="text-xs text-gray-400">
                {allFiltered.length} użytkowników
                {search && ` · szukaj: "${search}"`}
                {roleFilter !== "all" && ` · rola: ${roleFilter}`}
                {dateFilter !== "all" && ` · okres: ${dateFilter}`}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={12} /> Poprzednia
                  </button>
                  <span className="text-xs text-gray-500 px-1">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Następna <ChevronRight size={12} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
