import Card from '@/components/ui/Card';

export default function FidelidadeLoading() {
    return (
        <div className="max-w-[1200px] mx-auto animate-fadeIn">
            {/* Header */}
            <div className="flex items-start justify-between gap-5 mb-6 flex-wrap">
                <div>
                    <div className="h-10 w-64 skeleton mb-2" />
                    <div className="h-5 w-48 skeleton" />
                </div>
                <div className="flex gap-2">
                    <div className="h-10 w-32 skeleton rounded-md" />
                    <div className="h-10 w-32 skeleton rounded-md" />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6 max-md:grid-cols-2 max-[480px]:grid-cols-1">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="flex items-center gap-4 p-5!">
                        <div className="w-10 h-10 rounded-full skeleton" />
                        <div className="flex flex-col gap-2">
                            <div className="h-6 w-16 skeleton" />
                            <div className="h-4 w-24 skeleton" />
                        </div>
                    </Card>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-border pb-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-11 w-32 skeleton rounded-md" />
                ))}
            </div>

            {/* Content Skeleton */}
            <Card className="p-4">
                <div className="h-12 w-full skeleton mb-4 rounded-md" />
                <div className="flex flex-col gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center justify-between p-4 border-b border-border last:border-b-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full skeleton" />
                                <div className="flex flex-col gap-2">
                                    <div className="h-5 w-32 skeleton" />
                                    <div className="h-4 w-24 skeleton" />
                                </div>
                            </div>
                            <div className="flex gap-6">
                                <div className="h-5 w-16 skeleton" />
                                <div className="h-5 w-16 skeleton" />
                                <div className="h-5 w-16 skeleton" />
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
