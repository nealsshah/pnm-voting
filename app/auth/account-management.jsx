"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

// Mock data for accounts
const mockAccounts = [
  { id: 1, username: "brother1", role: "brother", status: "active" },
  { id: 2, username: "brother2", role: "brother", status: "active" },
  { id: 3, username: "newuser1", role: "brother", status: "pending" },
  { id: 4, username: "newuser2", role: "brother", status: "pending" },
]

export function AccountManagement() {
  const [accounts, setAccounts] = useState(mockAccounts)
  const [selectedAccounts, setSelectedAccounts] = useState([])

  const approveAccount = (id) => {
    setAccounts(accounts.map(
      (account) => (account.id === id ? { ...account, status: "active" } : account)
    ))
    // TODO: Implement API call to approve account
  }

  const rejectAccount = (id) => {
    setAccounts(accounts.filter((account) => account.id !== id))
    // TODO: Implement API call to reject account
  }

  const removeAccount = (id) => {
    setAccounts(accounts.filter((account) => account.id !== id))
    // TODO: Implement API call to remove account
  }

  const toggleSelectAccount = (id) => {
    setSelectedAccounts(
      (prev) => (prev.includes(id) ? prev.filter((accId) => accId !== id) : [...prev, id])
    )
  }

  const purgeSelectedAccounts = () => {
    setAccounts(accounts.filter((account) => !selectedAccounts.includes(account.id)))
    setSelectedAccounts([])
    // TODO: Implement API call to purge selected accounts
  }

  const purgeAllAccounts = () => {
    setAccounts([])
    setSelectedAccounts([])
    // TODO: Implement API call to purge all accounts
  }

  return (
    (<div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Pending Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] w-full rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Username</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts
                  .filter((account) => account.status === "pending")
                  .map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.username}</TableCell>
                      <TableCell>
                        <div className="space-x-2">
                          <Button onClick={() => approveAccount(account.id)} size="sm" variant="outline">
                            Approve
                          </Button>
                          <Button onClick={() => rejectAccount(account.id)} variant="destructive" size="sm">
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Active Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-end space-x-2">
              <Button
                onClick={purgeSelectedAccounts}
                variant="destructive"
                size="sm"
                disabled={selectedAccounts.length === 0}>
                Purge Selected
              </Button>
              <Button onClick={purgeAllAccounts} variant="destructive" size="sm">
                Purge All
              </Button>
            </div>
            <ScrollArea className="h-[300px] w-full rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Select</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts
                    .filter((account) => account.status === "active")
                    .map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedAccounts.includes(account.id)}
                            onCheckedChange={() => toggleSelectAccount(account.id)} />
                        </TableCell>
                        <TableCell className="font-medium">{account.username}</TableCell>
                        <TableCell>{account.role}</TableCell>
                        <TableCell>
                          <Button onClick={() => removeAccount(account.id)} variant="destructive" size="sm">
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>)
  );
}

