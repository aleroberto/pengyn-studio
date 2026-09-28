"""Run separately from the API: python worker.py"""
import asyncio
import logging

from database import claim_job, claim_regeneration, complete_job, fail_job, finish_regeneration
from services.ia_service import IAService
from services.storage import ImageStorage

logger = logging.getLogger(__name__)


def titles_for(job):
    titles = [item.strip() for item in job["titles"] if item and item.strip()]
    return (titles + [f"{job['title']} {i + 1}" for i in range(len(titles), job["quantity"])])[:job["quantity"]]


async def process_one(service=None, storage=None):
    job = claim_job()
    if job is None:
        regen = claim_regeneration()
        if regen is None:
            return False
        service = service or IAService()
        storage = storage or ImageStorage()
        try:
            kwargs = {"brief": regen["brief"]} if any(regen["brief"].values()) else {}
            posts = await service.generate_campaign(regen["niche"], regen["style"], [regen["title"]], regen["goal"], storage, **kwargs)
            finish_regeneration(regen["id"], posts[0])
        except Exception as exc:
            logger.exception("Regeneration failed for %s", regen["id"])
            finish_regeneration(regen["id"], None, str(exc))
        return True
    service = service or IAService()
    storage = storage or ImageStorage()
    try:
        kwargs = {"brief": job["brief"]} if any(job["brief"].values()) else {}
        posts = await service.generate_campaign(job["niche"], job["style"], titles_for(job), job["goal"], storage, **kwargs)
        complete_job(job["job_id"], posts)
    except Exception as exc:
        logger.exception("Generation failed for job %s", job["job_id"])
        fail_job(job["job_id"], str(exc))
    return True


async def main():
    logging.basicConfig(level=logging.INFO)
    while True:
        if not await process_one():
            await asyncio.sleep(3)


if __name__ == "__main__":
    asyncio.run(main())
