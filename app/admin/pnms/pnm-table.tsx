
"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";

interface Pnm {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    major: string;
    year: string;
    gpa: number;
}

interface PnmTableProps {
    pnms: Pnm[];
    onEdit: (pnm: Pnm) => void;
    onDelete: (id: string) => void;
}

export function PnmTable({ pnms, onEdit, onDelete }: PnmTableProps) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Major</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>GPA</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {pnms.map((pnm) => (
                    <TableRow key={pnm.id}>
                        <TableCell>
                            {pnm.first_name} {pnm.last_name}
                        </TableCell>
                        <TableCell>{pnm.email}</TableCell>
                        <TableCell>{pnm.major}</TableCell>
                        <TableCell>{pnm.year}</TableCell>
                        <TableCell>{pnm.gpa}</TableCell>
                        <TableCell className="text-right">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEdit(pnm)}
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDelete(pnm.id)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
} 