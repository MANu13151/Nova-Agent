cache = {}


def get_cached_sql(question):
    return cache.get(question)


def save_cached_sql(question, sql):
    cache[question] = sql