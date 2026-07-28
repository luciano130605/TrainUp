// components/PageSkeleton.jsx
import { Skeleton } from 'boneyard-js/react';
import { useMinLoading } from '../utils/useMinLoading';

export default function PageSkeleton({ name, ready = true, minMs = 2000, children }) {
    const loading = useMinLoading(ready, minMs, name);
    return <Skeleton name={name} loading={loading}>{children}</Skeleton>;
}